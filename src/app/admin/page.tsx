import { getVotings, logout, toggleVotingStatus } from '../actions';
import Link from 'next/link';
import CreateVotingForm from './create-form';
import { revalidatePath } from 'next/cache';
import DeleteVotingButton from './delete-button';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export const dynamic = 'force-dynamic';

export default async function AdminPage(props: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const status = (searchParams.status || 'all') as 'all' | 'open' | 'closed';
  const { votings, totalPages, currentPage } = await getVotings({ page, limit: 5, status });

  return (
    <div className="min-h-screen bg-gray-50 md:p-8 p-3">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between flex-wrap  items-center mb-8 ">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <form action={logout}>
            <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm">
              Logout
            </button>
          </form>
        </div>

        {/* Create Voting Section */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Criar nova votação</h2>
          <CreateVotingForm />
        </div>

        {/* Voting List Section */}
        <div className="space-y-6">
          <div className="flex justify-between flex-wrap items-center">
            <h2 className="text-2xl font-bold text-gray-800">Votações</h2>
            <div className="flex gap-2">
              <Link href={`/admin?status=all&page=1`}>
                <Button variant={status === 'all' ? 'default' : 'outline'} size="sm">
                  Todas
                </Button>
              </Link>
              <Link href={`/admin?status=open&page=1`}>
                <Button variant={status === 'open' ? 'default' : 'outline'} size="sm">
                  Abertas
                </Button>
              </Link>
              <Link href={`/admin?status=closed&page=1`}>
                <Button variant={status === 'closed' ? 'default' : 'outline'} size="sm">
                  Fechadas
                </Button>
              </Link>
            </div>
          </div>
          {votings.length === 0 ? (
            <p className="text-gray-500">Nenhuma votação criada.</p>
          ) : (
            votings.map((voting) => (
              <div key={voting.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-4 flex-wrap">
                  <div className="mb-3">
                    <h3 className="text-xl font-bold text-gray-900">{voting.title}</h3>
                    <p className="text-sm text-gray-500">
                      Criado: {new Date(voting.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm font-medium text-blue-600 mt-1">
                      Link: <a href={`/vote/${voting.id}`} className="underline hover:text-blue-800" target="_blank">/vote/{voting.id}</a>
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        voting.isOpen
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {voting.isOpen ? 'ABERTA' : 'FECHADA'}
                    </span>
                    <form action={toggleVotingStatus.bind(null, voting.id, !voting.isOpen)}>
                      <button className="text-sm text-gray-600 hover:text-gray-900 underline">
                        {voting.isOpen ? 'Fechar votação' : 'Re-abrir votação'}
                      </button>
                    </form>
                    <span className="text-gray-300">|</span>
                    <DeleteVotingButton votingId={voting.id} />
                  </div>
                </div>

                {/* Results Preview */}
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Visualização de resultados</h4>
                  <div className="space-y-2">
                    {voting.options.map((opt) => {
                      const totalVotes = voting._count.voteLogs; 
                      const percentage = totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : '0';
                      
                      return (
                        <div key={opt.id} className="flex flex-wrap items-center text-sm">
                          <span className="md:w-1/3 w-full truncate text-gray-700">{opt.label}</span>
                          <div className="w-1/2 bg-gray-200 rounded-full h-2.5 mr-2 hidden md:block">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-600 font-medium">
                            {opt.votes} ({percentage}%)
                          </span>
                        </div>
                      );
                    })}
                    <div className="text-right text-xs text-gray-500 mt-1">
                      Total de votos: {voting._count.voteLogs}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationPrevious href={`/admin?status=${status}&page=${currentPage - 1}`} />
                  </PaginationItem>
                )}
                
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink href={`/admin?status=${status}&page=${i + 1}`} isActive={currentPage === i + 1}>
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                {currentPage < totalPages && (
                  <PaginationItem>
                    <PaginationNext href={`/admin?status=${status}&page=${currentPage + 1}`} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
